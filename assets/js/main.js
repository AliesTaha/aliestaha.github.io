/*Showing Hidden Menu (Y)*/
const navMenu=document.getElementById('nav-menu'),
    navToggle=document.getElementById('nav-toggle'),
    navClose=document.getElementById('nav-close');

/*Show Menu, again :(*/
if(navToggle){
    //I just learned how to use arrow functions: too cool to not use.
    navToggle.addEventListener('click', ()=>{
        navMenu.classList.add('show-menu')
    })
    //now that I made show menu, I will introduce its style in css
}

/*Hide the menu, again*/
if(navClose){
    //define an arrow function 
    navClose.addEventListener('click', ()=> 
    {
        navMenu.classList.remove('show-menu')
    })
}


/*==================== REMOVE MENU MOBILE ====================*/
const navLink = document.querySelectorAll('.nav__link')

function linkAction(){
    const navMenu = document.getElementById('nav-menu')

    //Removing the show-menu class
    
    navMenu.classList.remove('show-menu')
}
navLink.forEach(n=>n.addEventListener('click', linkAction))

/*==================== ACCORDION SKILLS ====================*/


/*==================== QUALIFICATION TABS ====================*/


/*==================== SERVICES MODAL ====================*/


/*==================== PORTFOLIO SWIPER  ====================*/


/*==================== TESTIMONIAL ====================*/


/*==================== SCROLL SECTIONS ACTIVE LINK ====================*/


/*==================== CHANGE BACKGROUND HEADER ====================*/ 


/*==================== SHOW SCROLL UP ====================*/ 


/*==================== DARK LIGHT THEME ====================*/ 