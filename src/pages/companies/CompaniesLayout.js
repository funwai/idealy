import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const COMPANIES_SECTIONS = [
  { label: 'Individual Companies', to: '/Companies/individual' },
  { label: 'Company Data Availability', to: '/Companies/data-availability' },
];

const CompaniesLayout = () => {
  return (
    <div className="companies-page">
      <div className="companies-container companies-container--wide">
        <section className="companies-section-header" aria-label="Companies sections">
          <div className="companies-section-header__title-row">
            <h3 className="companies-section-header__title">Companies</h3>
          </div>
          <ul className="companies-section-header__links">
            {COMPANIES_SECTIONS.map(({ label, to }) => (
              <li key={to} className="companies-section-header__link-item">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `companies-section-header__link${isActive ? ' is-active' : ''}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>

        <Outlet />
      </div>
    </div>
  );
};

export default CompaniesLayout;
