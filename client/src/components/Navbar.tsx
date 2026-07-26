import { useLocation } from "wouter";

export default function Navbar() {
  const [location, navigate] = useLocation();

  return (
    <nav className="nav-bar">
      <div className="nav-bar-container">
        <button 
          className={`nav-item ${location === '/dashboard' ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
          aria-label="Home"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </button>
        
        <button 
          className={`nav-item ${location === '/recipes' ? 'active' : ''}`}
          onClick={() => navigate('/recipes')}
          aria-label="Recipes"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
        
        <button
          className="nav-item nav-item-add"
          onClick={() => navigate('/add-food')}
          aria-label="Add Food"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
