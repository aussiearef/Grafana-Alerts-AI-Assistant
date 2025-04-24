import * as React from "react";
import type { Location } from "history";
export declare function CompatRoute(props: any): React.JSX.Element;
export declare function CompatRouter({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export interface StaticRouterProps {
    basename?: string;
    children?: React.ReactNode;
    location: Partial<Location> | string;
}
/**
 * A `<Router>` that may not navigate to any other location. This is useful
 * on the server where there is no stateful UI.
 */
export declare function StaticRouter({ basename, children, location: locationProp, }: StaticRouterProps): React.JSX.Element;
