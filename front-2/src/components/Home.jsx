import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Add automatic scroll to welcome section
    const element = document.getElementById('welcome');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []); // Only run once on mount

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
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
                <span style={styles.cardIcon}>🔍</span>
                <h3>Intuitive Visualization</h3>
              </div>
              <div style={styles.welcomeCard}>
                <span style={styles.cardIcon}>📊</span>
                <h3>Advanced Analytics</h3>
              </div>
              <div style={styles.welcomeCard}>
                <span style={styles.cardIcon}>🛡️</span>
                <h3>Enhanced Security</h3>
              </div>
            </div>
          </div>
        </section>

        <div style={{...styles.content, opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)'}}>

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
    </div>
  );
}

const styles = {
  mainContainer: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg,rgb(217, 217, 217) 0%,rgb(91, 91, 91) 100%)',
    overflowY: 'visible',
    overflowX: 'hidden',
    position: 'absolute', // Changed from relative
    top: 0,
    left: 0,
    right: 0,
  },
  container: {
    width: '100%',
    paddingTop: '80px',
    position: 'relative',
    minHeight: '100%',
    overflowY: 'visible',
  },
  welcomeSection: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
  },
  welcomeContent: {
    maxWidth: '1200px',
    width: '100%',
    textAlign: 'center',
    color: 'black',
  },
  welcomeTitle: {
    fontSize: '4rem',
    marginBottom: '2rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
    background: 'linear-gradient(45deg, #fff, #f0f0f0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: '#5f3434d6',
  },
  welcomeText: {
    fontSize: '1.5rem',
    maxWidth: '800px',
    margin: '0 auto 4rem auto',
    lineHeight: '1.6',
    color: 'rgba(0, 0, 0, 0.9)',
  },
  welcomeCards: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    flexWrap: 'wrap',
    marginTop: '3rem',
  },
  welcomeCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '2rem',
    borderRadius: '15px',
    width: '250px',
    backdropFilter: 'blur(5px)',
    transition: 'transform 0.3s ease',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-10px)',
    },
  },
  cardIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    background: 'rgba(121, 133, 155, 0.95)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    height: '80px', // Add explicit height
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navTitle: {
    color: '#602626',
    margin: 0,
    fontSize: '1.5rem',
    cursor: 'pointer',
    '&:hover': {
      opacity: 0.8,
    },
  },
  navLinks: {
    display: 'flex',
    gap: '1rem',
  },
  navButton: {
    background: 'transparent',
    color: '#602626',
    border: '2px solid transparent',
    padding: '0.5rem 1rem',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '1rem',
    '&:hover': {
      borderColor: 'white',
    },
  },
  content: {
    width: '100%',
    margin: '0 auto',
    padding: '2rem',
    color: 'white',
    transition: 'all 0.8s ease-out',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    marginBottom: '4rem',
  },
  title: {
    fontSize: '3.5rem',
    marginBottom: '1rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '1.5rem',
    opacity: 0.9,
    maxWidth: '600px',
    margin: '0 auto',
  },
  features: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginBottom: '4rem',
    flexWrap: 'wrap',
  },
  featureCard: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '15px',
    width: '300px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    transform: 'scale(1)',
    '&:hover': {
      transform: 'translateY(-5px)',
      background: 'rgba(255,255,255,0.15)',
    },
    '&:active': {
      transform: 'scale(0.98)',
    }
  },
  iconPlaceholder: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  button: {
    background: '#4CAF50',
    color: 'black',
    border: 'none',
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    borderRadius: '30px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
    transition: 'all 0.3s ease',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  section: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '6rem 2rem',
    margin: '0', // Remove margin
    position: 'relative',
    width: '100%',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    marginBottom: '2rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  sectionText: {
    fontSize: '1.2rem',
    maxWidth: '800px',
    textAlign: 'center',
    marginBottom: '2rem',
    lineHeight: '1.6',
  },
  actionButton: {
    background: 'rgba(255,255,255,0.15)',
    color: 'black',
    border: '2px solid white',
    padding: '1rem 2rem',
    borderRadius: '30px',
    fontSize: '1.2rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255,255,255,0.25)',
      transform: 'translateY(-2px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
};

export default Home;
