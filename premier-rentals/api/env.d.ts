declare const process: {
  env: Record<string, string | undefined> & {
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
  };
};

