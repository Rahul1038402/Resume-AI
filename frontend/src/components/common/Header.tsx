import SiteNav from "./SiteNav";

/**
 * Header. Thin wrapper kept so existing imports across the app keep working
 * while the nav itself lives in SiteNav.
 */
const Header = () => <SiteNav />;

export default Header;
