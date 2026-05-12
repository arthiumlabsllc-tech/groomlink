declare module 'csurf' {
  import { RequestHandler } from 'express';
  
  interface CsrfOptions {
    cookie?: boolean | {
      key?: string;
      path?: string;
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      maxAge?: number;
    };
    ignoreMethods?: string[];
    sessionKey?: string;
    value?: (req: any) => string;
  }
  
  interface CsrfRequest extends Request {
    csrfToken?: () => string;
  }
  
  function csurf(options?: CsrfOptions): RequestHandler;
  export = csurf;
}
