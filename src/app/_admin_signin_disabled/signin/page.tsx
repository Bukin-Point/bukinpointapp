import { SignIn } from '@clerk/nextjs'
import { ShieldCheck } from 'lucide-react'

export default function AdminSignInPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-text">
                        Platform Admin
                    </h1>
                    <p className="mt-2 text-sm text-text-secondary">
                        Authorized Personnel Only
                    </p>
                </div>

                <div className="mt-8 rounded-2xl border bg-card p-4 shadow-xl">
                    <SignIn
                        appearance={{
                            elements: {
                                formButtonPrimary: 'bg-primary hover:bg-primary/90 text-sm normal-case',
                                card: 'shadow-none border-none p-0',
                                headerTitle: 'hidden',
                                headerSubtitle: 'hidden',
                                footer: 'hidden',
                                footerAction: 'hidden',
                                footerAction__signUp: 'hidden',
                                socialButtonsBlockButton: 'border-accent hover:bg-accent/50 text-xs',
                                dividerText: 'text-[10px] uppercase tracking-wider',
                                formFieldLabel: 'text-xs font-semibold uppercase tracking-wider text-text-secondary',
                                formFieldInput: 'rounded-xl border-accent focus:ring-primary h-11',
                            }
                        }}
                        redirectUrl="/admin/dashboard"
                        routing="hash"
                    />
                </div>

                <div className="text-center">
                    <p className="text-xs text-text-secondary italic">
                        By signing in, you agree to our platform security and auditing policies.
                    </p>
                </div>
            </div>
        </div>
    )
}
