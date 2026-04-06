'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  digest?: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, digest: undefined }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      digest: (error as Error & { digest?: string }).digest,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', {
      message: error.message,
      digest: (error as Error & { digest?: string }).digest,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {this.state.error && (
                <div className="mb-4 space-y-2">
                  <p className="text-body-sm text-text-secondary">
                    {this.state.error.message}
                  </p>
                  {this.state.digest && (
                    <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-left">
                      Digest: {this.state.digest}
                    </p>
                  )}
                </div>
              )}
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null, digest: undefined })
                  window.location.reload()
                }}
              >
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
