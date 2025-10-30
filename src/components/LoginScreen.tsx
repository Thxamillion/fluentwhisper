import { useAuth } from '@/hooks/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginScreen() {
  const { signIn, isSigningIn } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">FluentWhisper</CardTitle>
          <CardDescription>
            Sign in to sync your progress and access premium features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => signIn()}
            disabled={isSigningIn}
            className="w-full"
            size="lg"
          >
            {isSigningIn ? 'Opening browser...' : 'Sign In with Browser'}
          </Button>
          <p className="mt-4 text-center text-sm text-gray-500">
            This will open your web browser to complete sign in
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
