import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../assets/IMG-20250226-WA0031.jpg';

function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Automatically scroll to the welcome section on mount
    const element = document.getElementById('welcome');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openSignIn = () => {
    setIsSignInOpen(true);
  };

  const closeSignIn = () => {
    setIsSignInOpen(false);
  };

  return (
    <div style={styles.mainContainer}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <h2 style={styles.navTitle} onClick={() => scrollToSection('welcome')} role="button">
            AWS WAF Visualization
          </h2>
          <div style={styles.navLinks}>
            <button onClick={() => scrollToSection('visualization')} style={styles.navButton}>
              Dependency Visualization
            </button>
            <button onClick={() => scrollToSection('analysis')} style={styles.navButton}>
              Rule Analysis
            </button>
            <button onClick={() => scrollToSection('table')} style={styles.navButton}>
              Table View
            </button>
            <button onClick={openSignIn} style={styles.signInButton}>
              {/* Sign In SVG Icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#220d4e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={styles.signInIcon}
                aria-label="sign in"
              >
                <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <div style={styles.container}>
        <section id="welcome" style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <h1 style={styles.welcomeTitle}>Welcome to AWS WAF Visualization</h1>
            <p style={styles.welcomeText}>
              Transform your AWS WAF management experience with our powerful visualization tools.
              Discover insights, analyze patterns, and optimize your security rules with an
              intuitive interface designed for cloud security professionals.
            </p>
            <div style={styles.welcomeCards}>
              <div style={styles.welcomeCard}>
                {/* Modern SVG icon for Intuitive Visualization */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#220d4e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.cardIcon}
                >
                  <polyline points="3 6 9 11 13 7 21 12" />
                  <polyline points="3 12 9 17 13 13 21 18" />
                </svg>
                <h3 style={styles.cardTitle}>Intuitive Visualization</h3>
              </div>
              <div style={styles.welcomeCard}>
                {/* Modern SVG icon for Advanced Analytics */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#220d4e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.cardIcon}
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <h3 style={styles.cardTitle}>Advanced Analytics</h3>
              </div>
              <div style={styles.welcomeCard}>
                {/* Modern SVG icon for Enhanced Security */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#220d4e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.cardIcon}
                >
                  <path d="M12 2L2 7v5c0 5.25 3.75 10 10 12 6.25-2 10-6.75 10-12V7l-10-5z" />
                </svg>
                <h3 style={styles.cardTitle}>Enhanced Security</h3>
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            ...styles.content,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <section id="visualization" style={styles.section}>
            <h2 style={styles.sectionTitle}>Dependency Visualization</h2>
            <p style={styles.sectionText}>
              Explore the intricate relationships between your WAF rules through our interactive visualization tool.
              This powerful graph-based interface allows you to understand rule dependencies at a glance, making it
              easier to manage and optimize your WAF configuration.
            </p>
            <button onClick={() => navigate('/waf-tree')} style={styles.actionButton}>
              Explore Visualization
            </button>
          </section>

          <section id="analysis" style={styles.section}>
            <h2 style={styles.sectionTitle}>Rule Analysis</h2>
            <p style={styles.sectionText}>
              Gain valuable insights into your WAF traffic patterns with our comprehensive analytics dashboard.
              View detailed statistics, identify trends, and make data-driven decisions to enhance your security posture.
            </p>
            <button onClick={() => navigate('/waf-stats')} style={styles.actionButton}>
              View Analytics
            </button>
          </section>

          <section id="table" style={styles.section}>
            <h2 style={styles.sectionTitle}>Table View</h2>
            <p style={styles.sectionText}>
              Access a detailed, sortable table view of all your WAF rules. This format provides a clear overview
              of your rule configurations, making it easy to search, filter, and manage your security rules efficiently.
            </p>
            <button onClick={() => navigate('/waf-table')} style={styles.actionButton}>
              Open Table View
            </button>
          </section>
        </div>
      </div>

      {isSignInOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button onClick={closeSignIn} style={styles.closeModalButton}>×</button>
            <h2 style={styles.modalTitle}>Sign In</h2>
            <form style={styles.signInForm}>
              <input type="email" placeholder="Email" style={styles.inputField} />
              <input type="password" placeholder="Password" style={styles.inputField} />
              <button type="submit" style={styles.submitButton}>Sign In</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  mainContainer: {
    fontFamily: "'Poppins', sans-serif",
    width: '100%',
    height: '100%',
    background: `url(${backgroundImage}) no-repeat center center / cover`,
    overflowY: 'visible',
    overflowX: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    background: '#FFFFFF',
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    height: '70px',
    display: 'flex',
    alignItems: 'center',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  navTitle: {
    color: '#220d4e',
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  navLinks: {
    display: 'flex',
    gap: '1rem',
  },
  navButton: {
    background: 'transparent',
    color: '#220d4e',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background 0.2s ease',
  },
  signInButton: {
    background: 'transparent',
    color: '#220d4e',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background 0.2s ease',
  },
  signInIcon: {
    width: '24px',
    height: '24px',
    display: 'block',
  },
  container: {
    width: '100%',
    paddingTop: '70px',
    position: 'relative',
    minHeight: '100%',
    overflowY: 'visible',
  },
  welcomeSection: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    // We can add a fallback background color/gradient if desired
    background: 'transparent',
    textAlign: 'center',
  },
  welcomeContent: {
    maxWidth: '1200px',
    width: '100%',
    color: '#220d4e',
  },
  welcomeTitle: {
    fontSize: '3.5rem',
    marginBottom: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  welcomeText: {
    fontSize: '1.25rem',
    maxWidth: '800px',
    margin: '0 auto 3rem auto',
    lineHeight: 1.6,
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },
  welcomeCards: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    flexWrap: 'wrap',
    marginTop: '2rem',
  },
  welcomeCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '2rem',
    borderRadius: '15px',
    width: '250px',
    border: '1px solid rgba(255,255,255,0.2)',
    transition: 'transform 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: '1rem',
  },
  cardTitle: {
    color: '#220d4e',
    fontSize: '1.2rem',
    fontWeight: 600,
    margin: 0,
    textAlign: 'center',
  },
  content: {
    width: '100%',
    margin: '0 auto',
    padding: '2rem',
    color: '#220d4e',
    transition: 'all 0.8s ease-out',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  section: {
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem 2rem',
    margin: 0,
    position: 'relative',
    width: '100%',
    background: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '2.2rem',
    marginBottom: '1.5rem',
    fontWeight: 700,
    color: '#220d4e',
  },
  sectionText: {
    fontSize: '1.1rem',
    maxWidth: '800px',
    textAlign: 'center',
    marginBottom: '2rem',
    lineHeight: 1.6,
    color: '#220d4e',
  },
  actionButton: {
    background: '#6938AF',
    color: '#FFFFFF',
    border: '2px solid #6938AF',
    padding: '0.9rem 2rem',
    borderRadius: '30px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    background: '#FFFFFF',
    padding: '2rem',
    borderRadius: '8px',
    position: 'relative',
    width: '300px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
    color: '#220d4e',
  },
  closeModalButton: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    background: 'transparent',
    border: 'none',
    fontSize: '1.2rem',
    color: '#220d4e',
    cursor: 'pointer',
  },
  modalTitle: {
    margin: '0 0 1rem 0',
    fontWeight: 600,
  },
  signInForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem',
  },
  inputField: {
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #CCC',
    background: '#F6F3FD',
    color: '#333',
    width: '100%',
  },
  submitButton: {
    background: '#220d4e',
    color: '#FFFFFF',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export default Home;
