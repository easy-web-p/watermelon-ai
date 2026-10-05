import { SignIn } from './SignIn';

/**
 * Register route is unified with SignIn into a seamless authentication screen.
 * Rendering Register sets initialMode to "register" while allowing instant tab switching.
 */
export function Register() {
  return <SignIn initialMode="register" />;
}
