import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../assets/pexels-scottwebb-1029624.jpg';
import logo from '../assets/1002079229-removebg-preview.png';

function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  // Track scroll position to update navbar background
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    // Listen for scroll to toggle navbar background
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };


  return (
    <div style={styles.mainContainer}>
      <nav
        style={{
          ...styles.nav,
          // Change background & box-shadow based on scroll
          background: isScrolled
            ? '#fff'
            : 'rgba(255, 255, 255, 0.5)',
          boxShadow: isScrolled
            ? '0 2px 10px rgba(0,0,0,0.15)'
            : '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <div style={styles.navContent}>
          <img
            src={logo}
            alt="Logo"
            style={styles.logoImage}
            onClick={() => scrollToSection('welcome')}
          />
          <div style={styles.navLinks}>
            <button onClick={() => scrollToSection('visualization')} style={styles.navButton}>
              Visualization
            </button>
            <button onClick={() => scrollToSection('about')} style={styles.navButton}>
              About
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
              <div style={styles.welcomeCard} onClick={() => scrollToSection('visualization')}>
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
              <div style={styles.welcomeCard} onClick={() => scrollToSection('analysis')}>
                {/* Modern SVG icon for Advanced Analytics */}
                <svg
                  width="48px"
                  height="48px"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={styles.cardIcon}
                >
                  <path
                    d="M10 11C10 10.4477 10.4477 10 11 10H13C13.5523 10 14 10.4477 14 11C14 11.5523 13.5523 12 13 12H11C10.4477 12 10 11.5523 10 11Z"
                    fill="black"
                  />
                  <path
                    d="M11 14C10.4477 14 10 14.4477 10 15C10 15.5523 10.4477 16 11 16H13C13.5523 16 14 15.5523 14 15C14 14.4477 13.5523 14 13 14H11Z"
                    fill="black"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9.09447 4.74918C8.41606 4.03243 8 3.0648 8 2H10C10 3.10457 10.8954 4 12 4C13.1046 4 14 3.10457 14 2H16C16 3.0648 15.5839 4.03243 14.9055 4.74918C16.1782 5.45491 17.1673 6.6099 17.6586 8H19C19.5523 8 20 8.44772 20 9C20 9.55229 19.5523 10 19 10H18V12H19C19.5523 12 20 12.4477 20 13C20 13.5523 19.5523 14 19 14H18V16H19C19.5523 16 20 16.4477 20 17C20 17.5523 19.5523 18 19 18H17.6586C16.8349 20.3304 14.6124 22 12 22C9.38756 22 7.16508 20.3304 6.34141 18H5C4.44772 18 4 17.5523 4 17C4 16.4477 4.44772 16 5 16H6V14H5C4.44772 14 4 13.5523 4 13C4 12.4477 4.44772 12 5 12H6V10H5C4.44772 10 4 9.55229 4 9C4 8.44772 4.44772 8 5 8H6.34141C6.83274 6.6099 7.82181 5.45491 9.09447 4.74918ZM8 16V10C8 7.79086 9.79086 6 12 6C14.2091 6 16 7.79086 16 10V16C16 18.2091 14.2091 20 12 20C9.79086 20 8 18.2091 8 16Z"
                    fill="rgb(34, 13, 78)"
                  />
                </svg>

                <h3 style={styles.cardTitle}>Advanced Analytics</h3>
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
              Explore the intricate relationships between your WAF rules through our interactive
              visualization tool. This powerful graph-based interface allows you to understand
              rule dependencies at a glance, making it easier to manage and optimize your WAF
              configuration.
            </p>
            <button onClick={() => navigate('/app')} style={styles.actionButton}>
              Explore Visualization
            </button>
          </section>

          <section id="about" style={styles.section}>
            <h2 style={styles.sectionTitle}>About AWS WAF Visualization</h2>
            <p style={styles.sectionText}>
              Our tool simplifies the complex task of managing AWS WAF rules by providing
              intuitive visualization and analysis capabilities. Whether you're managing a small
              set of rules or a complex enterprise configuration, our tool helps you understand
              and optimize your security setup.
            </p>
            <button onClick={() => navigate('/about')} style={styles.actionButton}>
              Learn More
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

// Updated styles object with a new style for the logo
const styles = {
  mainContainer: {
    fontFamily: "'Poppins', sans-serif",
    width: '100%',
    height: '100%',
    background: `url(${backgroundImage}) no-repeat center center / cover`,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflowX: 'hidden',
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
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
  // 3) A style for the AppsFlyer logo image
  logoImage: {
    height: '100px',
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
  },
  welcomeSection: {
    minHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
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
    lineHeight: 1.6,
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
    margin: '0 auto',
  },
  welcomeCards: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    flexWrap: 'wrap',
    marginTop: '2rem',
  },
  welcomeCard: {
    background: 'rgba(255, 255, 255, 0.5)',
    padding: '2rem',
    borderRadius: '15px',
    width: '250px',
    transition: 'transform 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '3px solid #220d4e',
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
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem 2rem',
    width: '100%',
    background: 'rgba(255, 255, 255, 0.5)',
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
    color: '#333',
  },
  actionButton: {
    background: '#220d4e',
    color: '#FFFFFF',
    border: '2px solid #220d4e',
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