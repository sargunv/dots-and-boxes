declare module "*.css" {
  const content: string;
  export default content;
}

interface ImportMeta {
  readonly env: {
    /** The Vite `base` the app was built with (e.g. "/dots-and-boxes/"). */
    readonly BASE_URL: string;
  };
}
