// ─── App.jsx — Root Component ─────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar           from './components/Layout/Navbar';
import Home             from './components/Home/Home';
import AnimalProfiles   from './components/AnimalProfiles/AnimalProfiles';
import TaskList         from './components/TaskList/TaskList';
import Marketplace      from './components/Marketplace/Marketplace';
import DosageCalculator from './components/DosageCalculator/DosageCalculator';
import CalendarView     from './components/Calendar/CalendarView';
import VetFinder        from './components/VetFinder/VetFinder';
import Checkout         from './components/Checkout/Checkout';
import { getCurrentUser, onAuthStateChange, signOut } from './components/Auth/AuthAPI';

const TABS = [
  { id: 'home',     label: 'Home',             protected: false },
  { id: 'animals',  label: 'Animal Profiles',  protected: true  },
  { id: 'tasks',    label: 'Task List',         protected: true  },
  { id: 'market',   label: 'Marketplace',       protected: true  },
  { id: 'dosage',   label: 'Dosage Calculator', protected: true  },
  { id: 'calendar', label: 'Calendar',          protected: false },
  { id: 'vets',     label: 'Vet Finder',        protected: false },
];

const TAB_COMPONENTS = {
  home:     Home,
  animals:  AnimalProfiles,
  tasks:    TaskList,
  market:   Marketplace,
  dosage:   DosageCalculator,
  calendar: CalendarView,
  vets:     VetFinder,
  checkout: Checkout,
};

export default function App() {
  const [user,      setUser]      = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [autoAdd,   setAutoAdd]   = useState(false);

  function handleTabChange(tabId, openAdd = false) {
    setActiveTab(tabId);
    setAutoAdd(openAdd);
  }

  // ── Cart state ────────────────────────────────────────────────────────────
  // Each cart item: { id, title, price, unit, seller_name, quantity }
  const [cart, setCart] = useState([]);

  // Add an item — if it's already in the cart, increment quantity instead.
  function addToCart(listing) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === listing.id);
      if (existing) {
        return prev.map((item) =>
          item.id === listing.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...listing, quantity: 1 }];
    });
  }

  // Remove an item completely from the cart.
  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  // Update the quantity of a specific cart item.
  function updateQty(id, qty) {
    if (qty < 1) { removeFromCart(id); return; }
    setCart((prev) =>
      prev.map((item) => item.id === id ? { ...item, quantity: qty } : item)
    );
  }

  // Empty the entire cart (called after a successful order).
  function clearCart() {
    setCart([]);
  }

  // Total number of individual units across all cart items (for the badge).
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser()
      .then((u) => { if (u) setUser(buildDisplayUser(u)); })
      .catch(() => {})
      .finally(() => setAuthReady(true));

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user ? buildDisplayUser(session.user) : null);
      setAuthReady(true);
      if (event === 'SIGNED_IN') setActiveTab('home');
    });

    return () => subscription.unsubscribe();
  }, []);

  function buildDisplayUser(u) {
    return {
      id:    u.id,
      email: u.email,
      name:  u.user_metadata?.full_name || u.email,
    };
  }

  function handleLogin(displayUser) { setUser(displayUser); }

  async function handleLogout() {
    try { await signOut(); } catch (err) { console.error(err); }
  }

  if (!authReady) {
    return <div className="app-container"><div className="app-auth-loading">Loading…</div></div>;
  }

  // Checkout is handled outside the normal tab guard — it's always accessible.
  const isCheckout  = activeTab === 'checkout';
  const currentTab  = TABS.find((t) => t.id === activeTab);
  const Component   = TAB_COMPONENTS[activeTab] ?? Marketplace;

  // Props passed to every rendered component.
  const sharedProps = {
    user,
    cart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    onTabChange:    handleTabChange,
    autoAdd,
    onClearAutoAdd: () => setAutoAdd(false),
    onGoToCheckout: () => setActiveTab('checkout'),
    onGoToMarket:   () => setActiveTab('market'),
  };

  return (
    <div className="app-container">
      <Navbar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        cartCount={cartCount}
      />

      <main className={`app-content${activeTab === 'home' ? ' app-content--home' : ''}`}>
        {/* Checkout bypasses the normal protected-tab guard */}
        {isCheckout ? (
          <Component key="checkout" {...sharedProps} />
        ) : currentTab?.protected && !user ? (
          <div className="app-signin-prompt">
            <div className="app-signin-card">
              <h2 className="app-signin-title">Sign in to continue</h2>
              <p className="app-signin-desc">
                {currentTab.label} is only visible to you after signing in.
                Click <strong>Sign In</strong> in the top-right corner.
              </p>
            </div>
          </div>
        ) : (
          <Component key={user?.id ?? 'guest'} {...sharedProps} />
        )}
      </main>
    </div>
  );
}
