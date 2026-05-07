import { redirect } from 'next/navigation';

export default function StaffSignupRedirect() {
  redirect('/admin/staff/add');
}
