/**
 * Helper to get the base application URL that handles Vercel preview environments correctly.
 */
export function getAppUrl(): string {
    // Use explicitly set NEXT_PUBLIC_APP_URL, but prefer VERCEL_URL in Vercel preview deployments
    // Vercel sets NEXT_PUBLIC_VERCEL_ENV=preview for preview deployments
    if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') {
        return process.env.NEXT_PUBLIC_APP_URL;
    }

    // Next.js/Vercel standard preview URLs
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }

    // Vercel system preview URL fallback
    if (typeof process !== 'undefined' && process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // Browser fallback
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // Fallback map
    const isLocal = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;
    return isLocal ? 'http://localhost:3000' : 'https://bukinpoint.com';
}

/**
 * Helper to get the base domain for cookies, headers, and routing logic
 */
export function getBaseDomain(): string {
    // If explicitly defined without port/protocol, this can be an override

    // Try to extract from URL first
    const url = getAppUrl();
    try {
        const hostname = new URL(url).hostname;
        // Remove www if present
        const cleanHost = hostname.replace(/^www\./, '');

        // For localhost, return localhost
        if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') {
            return 'localhost';
        }

        // If it's a vercel app url, return that exact domain so cookies work
        if (cleanHost.endsWith('.vercel.app')) {
            return cleanHost;
        }

        // For proper domains
        const parts = cleanHost.split('.');
        if (cleanHost.endsWith('.test') && parts.length >= 2) {
            return parts.slice(-2).join('.');
        } else if (parts.length >= 2) {
            // Get root domain (e.g. bukinpoint.com from app.bukinpoint.com)
            return parts.slice(-2).join('.');
        }
        return cleanHost;
    } catch (e) {
        const isLocal = process.env.NODE_ENV !== 'production';
        return isLocal ? 'localhost' : 'bukinpoint.com';
    }
}

/**
 * Formats a provider subdomain URL.
 * Takes the Vercel preview limitations into account if necessary.
 */
export function getSubdomainUrl(subdomain: string, path: string = ''): string {
    const appUrl = getAppUrl();
    const domain = getBaseDomain();

    const parsedUrl = new URL(appUrl);
    const protocol = parsedUrl.protocol;
    const port = parsedUrl.port ? `:${parsedUrl.port}` : '';

    // Clean path
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // If we are in a Vercel preview (no wildcard support natively), we might want to return 
    // a specific format, but for now we'll assume they configured wildcard subdomains or we fallback.
    // Warning: standard Vercel preview URL doesn't natively support custom wildcard subdomains unless added to the project.
    return `${protocol}//${subdomain}.${domain}${port}${cleanPath}`;
}
