import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { BrandFacebookIcon, BrandGoogleIcon } from '@/components/icons'
import { PasswordField, TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { LoginInput, RegisterInput } from '@/contracts'
import { safeRedirect, useLogin, useRegister } from '@/features/auth/api'
import { HeroBanner, PromoCards } from '@/features/catalog/components/editorial'
import { applyApiError } from '@/lib/form-errors'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

const COPY: Record<Mode, { title: string; mobileTitle: string; description: string }> = {
  login: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  register: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

const unavailable = (feature: string) => () => toast.info(`${feature} não está disponível nesta demonstração.`)

function SocialButtons() {
  return (
    <div className="flex flex-col gap-4 pt-6 md:pt-6">
      <div className="flex items-center gap-3 text-[13px]">
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-4 md:px-20">
        {[
          { label: 'Continuar com Google', Icon: BrandGoogleIcon },
          { label: 'Continuar com Facebook', Icon: BrandFacebookIcon },
        ].map(({ label, Icon }) => (
          <button
            key={label}
            type="button"
            onClick={unavailable('O login social')}
            className="flex h-10 cursor-pointer items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] font-medium text-muted-foreground"
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-[5px] border border-destructive/50 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
      {message}
    </p>
  )
}

const submitClass = 'h-[60px] w-full rounded-[10px] md:h-[45px] md:rounded-[5px]'

export function LoginForm({ redirect }: { redirect?: string }) {
  const navigate = useNavigate()
  const login = useLogin()
  const { register, handleSubmit, setError, formState } = useForm<LoginInput>({ resolver: zodResolver(LoginInput) })

  const onSubmit = handleSubmit((input) =>
    login.mutateAsync(input).then(
      (session) => {
        toast.success(`Olá, ${session.user.displayName}!`)
        void navigate({ to: safeRedirect(redirect), replace: true })
      },
      (error: unknown) => applyApiError(error, setError, ['email', 'password']),
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <div className="flex flex-col gap-3 md:px-20 md:pt-6">
        <FormError message={formState.errors.root?.message} />
        <TextField label="E-mail" hideLabel type="email" autoComplete="email" placeholder="contato@email.com" error={formState.errors.email?.message} {...register('email')} />
        <PasswordField label="Senha" hideLabel autoComplete="current-password" placeholder="Senha" error={formState.errors.password?.message} {...register('password')} />
        <button type="button" onClick={unavailable('A recuperação de senha')} className="cursor-pointer self-end text-sm text-accent">
          Esqueceu a senha?
        </button>
      </div>
      <div className="mt-10 md:mt-0 md:px-20 md:pt-6">
        <Button type="submit" className={submitClass} disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </div>
      <SocialButtons />
    </form>
  )
}

const RegisterForm = RegisterInput.extend({ confirmPassword: z.string().min(1, 'Confirme a senha') }).refine(
  (values) => values.password === values.confirmPassword,
  { path: ['confirmPassword'], message: 'As senhas não coincidem' },
)
type RegisterFormValues = z.infer<typeof RegisterForm>

export function RegisterFormView({ redirect }: { redirect?: string }) {
  const navigate = useNavigate()
  const registerUser = useRegister()
  const { register, handleSubmit, setError, formState } = useForm<RegisterFormValues>({ resolver: zodResolver(RegisterForm) })

  const onSubmit = handleSubmit(({ confirmPassword: _confirm, ...input }) =>
    registerUser.mutateAsync(input).then(
      () => {
        toast.success('Conta criada! Você já está conectado.')
        void navigate({ to: safeRedirect(redirect), replace: true })
      },
      (error: unknown) => applyApiError(error, setError, ['username', 'email', 'password']),
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <div className="flex flex-col gap-3 md:px-20 md:pt-6">
        <FormError message={formState.errors.root?.message} />
        <TextField label="Nome de usuário" hideLabel autoComplete="username" placeholder="Nome de usuário" error={formState.errors.username?.message} {...register('username')} />
        <TextField label="E-mail" hideLabel type="email" autoComplete="email" placeholder="Digite seu e-mail" error={formState.errors.email?.message} {...register('email')} />
        <PasswordField label="Senha" hideLabel autoComplete="new-password" placeholder="Senha" error={formState.errors.password?.message} {...register('password')} />
        <PasswordField label="Confirmar senha" hideLabel autoComplete="new-password" placeholder="Confirmar senha" error={formState.errors.confirmPassword?.message} {...register('confirmPassword')} />
      </div>
      <div className="mt-10 md:mt-0 md:px-20 md:pt-6">
        <Button type="submit" className={submitClass} disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Criando...' : 'Criar conta'}
        </Button>
      </div>
      <SocialButtons />
    </form>
  )
}

function ModeLinks({ mode, redirect }: { mode: Mode; redirect?: string }) {
  const link = 'text-xl leading-4 font-medium'
  return (
    <nav aria-label="Acesso à conta" className="flex items-center justify-center gap-2">
      <Link to="/login" search={{ redirect }} replace className={cn(link, mode === 'login' ? 'text-accent' : 'text-foreground')} aria-current={mode === 'login' ? 'page' : undefined}>
        Entrar
      </Link>
      <span aria-hidden="true" className="h-5 w-px bg-destructive" />
      <Link to="/cadastro" search={{ redirect }} replace className={cn(link, mode === 'register' ? 'text-accent' : 'text-foreground')} aria-current={mode === 'register' ? 'page' : undefined}>
        Criar conta
      </Link>
    </nav>
  )
}

/** Desktop: modal sobre a página (como no Figma). Mobile: tela cheia. */
export function AuthShell({ mode, redirect, children }: { mode: Mode; redirect?: string; children: ReactNode }) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const copy = COPY[mode]

  if (!isDesktop) {
    return (
      <section aria-labelledby="auth-title" className="flex flex-col gap-10 px-3 pt-20 pb-10">
        <p aria-hidden="true" className="text-center text-[32px] leading-[42px] font-bold tracking-[0.1em]">
          KURIO
        </p>
        <h1 id="auth-title" className="text-center text-xl leading-4 font-bold">
          {copy.mobileTitle}
        </h1>
        {children}
        <p className="text-center text-[15px] text-muted-foreground">
          {mode === 'login' ? (
            <Link to="/cadastro" search={{ redirect }} replace>
              Novo na Kurio? Crie uma conta
            </Link>
          ) : (
            <Link to="/login" search={{ redirect }} replace>
              Já tem uma conta? Entre
            </Link>
          )}
        </p>
      </section>
    )
  }

  return (
    <>
      {/* Página de fundo, inerte enquanto o modal está aberto. */}
      <div inert aria-hidden="true">
        <HeroBanner />
        <PromoCards />
      </div>
      <Dialog open onOpenChange={(open) => !open && void navigate({ to: safeRedirect(redirect), replace: true })}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[500px] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-lg border-0 bg-card p-0 pb-12 sm:max-w-[500px]">
          <div className="flex flex-col items-center gap-10 px-12 pt-12">
            <ModeLinks mode={mode} redirect={redirect} />
            <DialogTitle className="sr-only">{copy.title}</DialogTitle>
            <DialogDescription className="text-center text-[13px] text-foreground">{copy.description}</DialogDescription>
          </div>
          {children}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2.5 bg-primary" />
        </DialogContent>
      </Dialog>
    </>
  )
}
