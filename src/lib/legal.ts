/**
 * Who runs the service, as the legal pages state it. It comes from the
 * environment, not the source, so whoever deploys a copy names themselves and
 * the repository does not carry a person's contact details. Missing values stop
 * the build: a policy with nobody behind it is worse than no deploy.
 */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env; the legal pages name who runs this service.`,
    );
  }
  return value;
}

export const OPERATOR_NAME = required("LEGAL_OPERATOR_NAME");
export const CONTACT_EMAIL = required("LEGAL_CONTACT_EMAIL");
export const LEGAL_UPDATED = "20 October 2026";
