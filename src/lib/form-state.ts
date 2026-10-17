/** What every form action returns: no exception, just a state to render. */
export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};
