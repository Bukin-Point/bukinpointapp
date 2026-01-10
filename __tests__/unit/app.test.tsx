import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('App', () => {
  it('renders the home page', () => {
    render(<Home />)
    // Basic test to verify setup works
    expect(document.body).toBeTruthy()
  })
})
