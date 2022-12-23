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
const navLink = document.querySelectorAll('.nav_link')

function linkAction(){
    const navMenu = document.getElementById('nav-menu')

    //Removing the show-menu class

    navMenu.classList.remove('show-menu')
}
navLink.forEach(n=>n.addEventListener('click', linkAction))

/*Skills*/
const skillsContent=document.getElementsByClassName('skills_content'),
    skillsHeader=document.querySelectorAll('.skills_header')

function toggleSkills(){
    let itemClass=this.parentNode.className

    for(i=0; i<skillsContent.length;i++){
        skillsContent[i].className='skills_content skills_close'
    }
    if(itemClass=='skills_content skills_close'){
        this.parentNode.className='skills_content skills_open'
    }
}

skillsHeader.forEach((eL)=>{
    eL.addEventListener('click', toggleSkills)
})

/*Qual Tabs*/

const tabs=document.querySelectorAll('[data-target]'),
    tabContents=document.querySelectorAll('[data-content]')

tabs.forEach(tab=>{
    tab.addEventListener('click', ()=>{
        const target=document.querySelector(tab.dataset.target)

        tabContents.forEach(tabContent=>{
            tabContent.classList.remove('qualification_active')
        })

        target.classList.add('qualification_active')

        tabs.forEach(tab=>{
            tab.classList.remove('qualification_active')
        })

        tab.classList.add('qualification_active')
    })
})

/*==================== Projects MODAL ====================*/
const modalViews=document.querySelectorAll('.projects_modal'),
    modalBtns=document.querySelectorAll('.projects_button'),
    modalCloses= document.querySelectorAll('.projects_modal-close')

let modal=function(modalClick){
    modalViews[modalClick].classList.add('active-modal')
}

modalBtns.forEach((modalBtn,i)=>{
    modalBtn.addEventListener('click', ()=>{
        modal(i)
    })
})
 
modalCloses.forEach((modalClose)=>{
    modalClose.addEventListener('click',()=>{
        modalViews.forEach((modalView)=>{
            modalView.classList.remove('active-modal')
        })
    })
})
/*==================== PORTFOLIO SWIPER  ====================*/


/*==================== TESTIMIAL ====================*/


/*==================== SCROLL SECTIONS ACTIVE LINK ====================*/


/*==================== CHANGE BACKGROUND HEADER ====================*/ 


/*==================== SHOW SCROLL UP ====================*/ 


/*DARK LIGHT THEME*/ 
const themeButton = document.getElementById('theme-button')
const darkTheme = 'dark-theme'
const iconTheme = 'uil-sun'

// Previously selected topic (if user selected)
const selectedTheme = localStorage.getItem('selected-theme')
const selectedIcon = localStorage.getItem('selected-icon')

// We obtain the current theme that the interface has by validating the dark-theme class
const getCurrentTheme = () => document.body.classList.contains(darkTheme) ? 'dark' : 'light'
const getCurrentIcon = () => themeButton.classList.contains(iconTheme) ? 'uil-moon' : 'uil-sun'

// We validate if the user previously chose a topic
if (selectedTheme) {
  // If the validation is fulfilled, we ask what the issue was to know if we activated or deactivated the dark
  document.body.classList[selectedTheme === 'dark' ? 'add' : 'remove'](darkTheme)
  themeButton.classList[selectedIcon === 'uil-moon' ? 'add' : 'remove'](iconTheme)
}

// Activate / deactivate the theme manually with the button
themeButton.addEventListener('click', () => {
    // Add or remove the dark / icon theme
    document.body.classList.toggle(darkTheme)
    themeButton.classList.toggle(iconTheme)
    // We save the theme and the current icon that the user chose
    localStorage.setItem('selected-theme', getCurrentTheme())
    localStorage.setItem('selected-icon', getCurrentIcon())
})