$ErrorActionPreference = 'Stop'

npx supabase db reset --local
if ($LASTEXITCODE -ne 0) {
  throw 'Local Supabase reset failed. Ensure Docker Desktop is running and inspect the CLI output.'
}

npx supabase test db --local
if ($LASTEXITCODE -ne 0) {
  throw 'Local Supabase database tests failed. Inspect the pgTAP output above.'
}
