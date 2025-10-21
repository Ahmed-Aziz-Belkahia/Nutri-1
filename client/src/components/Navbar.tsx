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
          <div className="nav-item-content">
            <svg className="nav-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </div>
        </button>
        
        <button 
          className={`nav-item ${location === '/recipes' ? 'active' : ''}`}
          onClick={() => navigate('/recipes')}
          aria-label="Recipes"
        >
          <div className="nav-item-content">
            <svg className="nav-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
            </svg>
          </div>
        </button>
        
        <button 
          className={`nav-item ${location === '/progress' ? 'active' : ''}`}
          onClick={() => navigate('/progress')}
          aria-label="Progress"
        >
          <div className="nav-item-content">
            <svg className="nav-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
            </svg>
          </div>
        </button>
        
        <button 
          className="nav-item nav-item-add"
          onClick={() => navigate('/enhanced-add-food')}
          aria-label="Add food"
        >
          <div className="nav-item-content">
            <svg className="nav-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
        </button>
      </div>
    </nav>
  );
}
