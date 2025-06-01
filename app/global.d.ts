// global.d.ts
interface Window {
  Clerk: {
    user?: {
      id: string;
      [key: string]: any;
    } | null;
    [key: string]: any; // Add other Clerk methods/properties as needed
  };
}