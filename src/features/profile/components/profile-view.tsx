import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ImageIcon } from '@/components/icons'
import { inputClass, PasswordField, RequiredMark, TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Password, UpdateProfileInput, type Profile } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { AccountLayout } from '@/features/profile/components/account-layout'
import { profileQuery, useChangePassword, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from '@/features/profile/api'
import { applyApiError } from '@/lib/form-errors'
import { cn } from '@/lib/utils'
import { HttpError } from '@/services/http/errors'

const MAX_AVATAR_BYTES = 1024 * 1024

/** Senha é opcional no mesmo formulário: só é validada se algum campo de senha for preenchido. */
const ProfileForm = UpdateProfileInput.extend({
  currentPassword: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
}).superRefine((values, ctx) => {
  const touched = values.currentPassword || values.newPassword || values.confirmPassword
  if (!touched) return
  if (!values.currentPassword) ctx.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Informe a senha atual' })
  const strength = Password.safeParse(values.newPassword)
  if (!strength.success) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: strength.error.issues[0]?.message ?? 'Senha inválida' })
  if (values.newPassword !== values.confirmPassword) {
    ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não coincidem' })
  }
})
type ProfileFormValues = z.infer<typeof ProfileForm>

function AvatarField({ profile }: { profile: Profile }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('O arquivo precisa ser uma imagem.')
    if (file.size > MAX_AVATAR_BYTES) return setError('A imagem deve ter até 1 MB.')
    setError('')
    upload.mutate(file, {
      onSuccess: () => toast.success('Avatar atualizado.'),
      onError: (failure) => setError(failure instanceof HttpError ? (failure.fieldErrors.avatar ?? failure.message) : 'Falha no envio.'),
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <span id="avatar-label" className="text-sm">
        Avatar
      </span>
      <div className="flex items-center gap-6" aria-labelledby="avatar-label" role="group">
        <span className="grid size-[50px] place-items-center overflow-hidden rounded-full border border-border bg-surface-raised text-accent">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar atual" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-5" aria-label="Sem avatar" role="img" />
          )}
        </span>
        <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Escolher imagem do avatar" onChange={onFile} />
        <Button type="button" size="sm" className="w-[98px]" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? 'Enviando...' : 'Alterar'}
        </Button>
        <button
          type="button"
          className="cursor-pointer text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!profile.avatarUrl || remove.isPending}
          onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success('Avatar removido.') })}
        >
          Remover
        </button>
      </div>
      <p role="status" className="text-[13px] text-destructive">
        {error}
      </p>
    </div>
  )
}

function ProfileFormView({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const { register, handleSubmit, setError, formState, resetField } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileForm),
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      ensName: profile.ensName ?? '',
      walletAlias: profile.walletAlias ?? '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword, confirmPassword: _confirm, ...fields }) => {
    try {
      await updateProfile.mutateAsync(fields)
    } catch (error) {
      return applyApiError(error, setError, ['displayName', 'username', 'email', 'ensName', 'walletAlias'])
    }
    if (currentPassword) {
      try {
        await changePassword.mutateAsync({ currentPassword, newPassword })
        for (const field of ['currentPassword', 'newPassword', 'confirmPassword'] as const) resetField(field)
      } catch (error) {
        return applyApiError(error, setError, ['currentPassword', 'newPassword'])
      }
    }
    toast.success(currentPassword ? 'Perfil e senha atualizados.' : 'Perfil atualizado.')
  })

  const errors = formState.errors
  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
      {errors.root?.message && (
        <p role="alert" className="rounded-[5px] border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <TextField label="Nome de exibição" required error={errors.displayName?.message} {...register('displayName')} />
        <TextField label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...register('username')} />
        <TextField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <div className="flex flex-col gap-1">
          <label htmlFor="profile-ens" className="text-sm">
            Nome ENS
            <RequiredMark />
          </label>
          <div className="flex gap-2">
            <span aria-hidden="true" className={cn(inputClass, 'flex w-auto items-center')}>
              .eth
            </span>
            <input
              id="profile-ens"
              required
              aria-invalid={Boolean(errors.ensName)}
              aria-describedby={errors.ensName ? 'profile-ens-error' : undefined}
              className={inputClass}
              {...register('ensName')}
            />
          </div>
          {errors.ensName && (
            <p id="profile-ens-error" className="text-[13px] text-destructive">
              {errors.ensName.message}
            </p>
          )}
        </div>
        <TextField label="Apelido da carteira" required error={errors.walletAlias?.message} {...register('walletAlias')} />
        <AvatarField profile={profile} />
      </div>

      <fieldset className="flex max-w-[417px] flex-col gap-4">
        <legend className="mb-4 text-[15px] font-bold">Alterar senha</legend>
        <PasswordField label="Senha atual" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
        <PasswordField label="Nova senha" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
        <PasswordField label="Confirmar nova senha" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      </fieldset>

      <Button type="submit" className="w-[131px]" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  )
}

export function ProfileView() {
  const { user } = useSession()
  const { data, isPending, isError, refetch } = useQuery({ ...profileQuery(user?.id ?? ''), enabled: Boolean(user) })
  return (
    <AccountLayout title="Perfil do colecionador">
      {isPending ? (
        <Skeleton className="mt-8 h-[520px]" />
      ) : isError ? (
        <div role="alert" className="mt-8 flex flex-col items-start gap-3">
          Não foi possível carregar o perfil.
          <Button size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <ProfileFormView key={data.userId} profile={data} />
      )}
    </AccountLayout>
  )
}
