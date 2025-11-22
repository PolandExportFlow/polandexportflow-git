import ResetPasswordComponent from "@/components/auth/ResetPassword";
import { Suspense } from 'react'; 

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordComponent />
    </Suspense>
  );
}