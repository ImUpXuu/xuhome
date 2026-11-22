/// <reference types="astro/client" />

declare module '*.css?url' {
  const url: string;
  export default url;
}
