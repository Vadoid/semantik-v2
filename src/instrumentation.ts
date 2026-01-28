
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/polyfill-storage');
    console.log('Instrumentation: Registered localStorage polyfill');
  }
}
