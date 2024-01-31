import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import './Navbar.css';

function Navbar() {

  const [click, setClick] = useState(false);
  const [button, setButton] = useState(true);

  const handleClick = () => setClick(!click);
  const closeMobileMenu = () => setClick(false);
  
  const showButton = () => {
    if(window.innerWidth <=700){
        setButton(false);
    }else{
        setButton(true);
    }
  }

  useEffect(()=>{
    showButton()
  }, [])

  window.addEventListener('resize', showButton);

  return (
    <>
      <nav className='navbar'>
        <div className='navbar-container'>
          <Link to='/' className='navbar-logo' onClick={closeMobileMenu}>
            SESDC MicroGrid Tool
          </Link>

          <div className='menu-icon' onClick={handleClick}>
            <i className={click ? 'fas fa-times' : 'fas fa-bars'} />
          </div>
          
          <ul className={click ? 'nav-menu active' : 'nav-menu'}>
            <li className='nav-item'>
              <Link to='/' className='nav-links' onClick={closeMobileMenu}>
                Home
              </Link>
            </li>
            <li className='nav-item'>
                <Link to='/net-load-calc' className='nav-links' onClick={closeMobileMenu}> 
                    Net Load Calculator
                </Link>
            </li>
            <li className='nav-item'>
                <Link to='/net-energy-calc' className='nav-links' onClick={closeMobileMenu}> 
                    Net Energy Calculator
                </Link>
            </li>
            <li className='nav-item'>
                <Link to='/log-in' className='nav-links-mobile' onClick={closeMobileMenu}> 
                    Log In
                </Link>
            </li>
          </ul> 
          {button && <Button buttonStyle='btn--outline'>Log In</Button>}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
