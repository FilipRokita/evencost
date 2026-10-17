// Loads .env for the integration tests. A missing file is not an error: CI and
// hosts provide the variables through the real environment.
try {
  process.loadEnvFile();
} catch {
  // no .env; fall through
}
