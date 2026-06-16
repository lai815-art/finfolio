// Loads the v3 screens in the same order as the original FinFolio.html.
// Each module attaches its component to `window` (legacy global wiring);
// app.jsx (last) reads them and mounts <ErrorBoundary><App/></ErrorBoundary>.
import './icons.jsx';
import './screens/portfolio.jsx';
import './screens/dashboard.jsx';
import './screens/accounts.jsx';
import './screens/accounting.jsx';
import './screens/advisor.jsx';
import './screens/settings.jsx';
import './screens/invest.jsx';
import './app.jsx';
