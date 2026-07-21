import { useLocation, type Location, Link } from 'react-router-dom';
import * as React from "react";

export enum NavLinkMatch {
    Exact = "Exact",
    Prefix = "Prefix",
};

interface NavLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
    activeClassName?: string;
    match?: NavLinkMatch;
}

export default function NavLink({
    to,
    className = '',
    activeClassName = '',
    match = NavLinkMatch.Exact,
    ...props
}: NavLinkProps) {
    const location: Location = useLocation();

    const destination = (typeof to == 'string' ? to : to.pathname) ?? "";
    const isActive = match === NavLinkMatch.Prefix ? location.pathname.startsWith(destination) : location.pathname == destination;

    const computedClassName = `
        ${className} ${isActive ? activeClassName : 'text-gray-400 hover:text-white'}
    `.trim();

    return (
        <Link to={to} className={computedClassName} { ...props }>
            { props.children }
        </Link>
    );
}