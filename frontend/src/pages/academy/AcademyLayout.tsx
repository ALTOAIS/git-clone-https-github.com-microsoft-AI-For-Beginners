import { Outlet } from 'react-router-dom';
import { AcademySubNav } from './AcademySubNav';

export function AcademyLayout() {
  return (
    <div>
      <AcademySubNav />
      <Outlet />
    </div>
  );
}
