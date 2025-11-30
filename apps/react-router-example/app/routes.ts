import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('signin', 'routes/signin.tsx'),
  route('signup', 'routes/signup.tsx'),
  route('auth/callback/google', 'routes/auth.callback.google.tsx'),
  route('api/refresh', 'routes/api.refresh.tsx'),
] satisfies RouteConfig
