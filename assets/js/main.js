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
const skillsContent=document.getElementsByClassName('skills_content')
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

/*==================== SERVICES MODAL ====================*/


/*==================== PORTFOLIO SWIPER  ====================*/


/*==================== TESTIMONIAL ====================*/


/*==================== SCROLL SECTIONS ACTIVE LINK ====================*/


/*==================== CHANGE BACKGROUND HEADER ====================*/ 


/*==================== SHOW SCROLL UP ====================*/ 


/*==================== DARK LIGHT THEME ====================*/ 