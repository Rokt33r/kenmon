import { Links, Meta, Outlet, Scripts } from 'react-router'
import { kenmonReactRouterMiddleware } from '@kenmon/react-router-adapter'
import type { Route } from './+types/root'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export const middleware: Route.MiddlewareFunction[] = [
  kenmonReactRouterMiddleware,
]
