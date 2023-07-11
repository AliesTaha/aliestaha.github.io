
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


/*Remove Menu*/
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

/*Modal Projects*/
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

/*Active links*/
const sections = document.querySelectorAll('section[id]')

function scrollActive(){
    const scrollY = window.pageYOffset

    sections.forEach(current =>{
        const sectionHeight = current.offsetHeight
        const sectionTop = current.offsetTop - 50;
        sectionId = current.getAttribute('id')

        if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight){
            document.querySelector('.nav_menu a[href*=' + sectionId + ']').classList.add('active-link')
        }else{
            document.querySelector('.nav_menu a[href*=' + sectionId + ']').classList.remove('active-link')
        }
    })
}
window.addEventListener('scroll', scrollActive)

/*Background header*/ 
function scrollHeader(){
    const nav = document.getElementById('header')
    // When the scroll is greater than 200 viewport height, add the scroll-header class to the header tag
    if(this.scrollY >= 80) nav.classList.add('scroll-header'); else nav.classList.remove('scroll-header')
}
window.addEventListener('scroll', scrollHeader)

/*Go up*/ 
function scrollUp(){
    const scrollUp = document.getElementById('scroll-up');
    // When the scroll is higher than 560 viewport height, add the show-scroll class to the a tag with the scroll-top class
    if(this.scrollY >= 560) scrollUp.classList.add('show-scroll'); else scrollUp.classList.remove('show-scroll')
}
window.addEventListener('scroll', scrollUp)

/*Dark and light them*/ 
const themeButton = document.getElementById('theme-button')
const darkTheme = 'dark-theme'
const iconTheme = 'uil-sun'

// Previously selected theme (if user selected)
const selectedTheme = localStorage.getItem('selected-theme');
const selectedIcon = localStorage.getItem('selected-icon');

// Function to set the dark theme as default
const setDarkTheme = () => {
  document.body.classList.add(darkTheme);
  themeButton.classList.add(iconTheme);
  localStorage.setItem('selected-theme', 'dark');
  localStorage.setItem('selected-icon', 'uil-moon');
};

setDarkTheme();

// Check if the user previously selected a theme
if (selectedTheme) {
  // Apply the user-selected theme and icon
  document.body.classList.toggle(darkTheme, selectedTheme === 'dark');
  themeButton.classList.toggle(iconTheme, selectedIcon === 'uil-moon');
} else {
  // Set the dark theme as default
  setDarkTheme();
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


var workExperiences = [
    {
      company: "Blackberry",
      position: "Reporting Automation Developer",
      duration: "May 2023 - Present",
      description: "Developed and architected full-stack internal web tools used to automate change and process management workflows.    \n \n\nImplemented best software practices when designing databases, APIs and web security."
    },
    {
        company: "UW Formula Electric",
        position: "Firmware Developer",
        duration: "October 2022 - December 2022",
        description: "• Resolved over 3 linter tasks and tracked team progress using industry standard tools like Bitbucket and Jira• Implemented low-level hardware control using C, including adding 10 new events warnings for battery states"
      },
      {
        company: "Enginera",
        position: "Front End Developer",
        duration: "January 2021 - June 2022",
        description: "• Increased the daily page visit count by 50 visits through the implementation of interactive forms, navigation and dropdown menus, built with HTML, CSS, and JavaScript • Implemented mobile-friendly responsive design for 3 screen sizes, resulting in a 15% mobile traffic increase • Communicated with University of Waterloo alumni to prepare panels, attended by over 230 members"
      },
      {
        company: "FIRST Robotics",
        position: "Programming Captain",
        duration: "Spetember 2020 - April 2022",
        description: "• Awarded as District Event Winner in Rapid React (2022), and received that Autonomous Award sponsored by Ford and District Event Finalist in Infinite Recharge (2020) • Managed a codebase and collaborated with over 12 developers using Git to assign tasks and track code changes • Coached over 40 team members in Java to seamlessly integrate the robot’s control systems into the overall design"
      },

      {
        company: "UW Orbital",
        position: "Firmware Developer",
        duration: "May 2023 - Present",
        description: "Currently doing on-boarding...Currently doing on-boarding...Currently doing on-boarding...Currently doing on-boarding..."
      },
    // Add more work experiences as needed
  ];
  
  function populateWorkExperiences() {
    var experienceList = document.getElementById("experience-list");
    var progressBar = document.getElementById("progress-bar");
  
    workExperiences.forEach(function (experience, index) {
      var li = document.createElement("li");
      li.textContent = experience.company;
  
      li.addEventListener("mouseover", function() {
        this.classList.add("highlight");
      });
  
      li.addEventListener("mouseout", function() {
        this.classList.remove("highlight");
      });
  
      li.addEventListener("click", function() {
        var selectedExperience = document.getElementsByClassName("selected");
        if (selectedExperience.length > 0) {
          selectedExperience[0].classList.remove("selected");
        }
        this.classList.add("selected");
        updateExperienceDescription(experience);
        var itemHeight = li.offsetHeight;
      var position = Array.from(experienceList.children).indexOf(li);
      var progressBarPosition = (position * itemHeight) + "px";
      progressBar.style.top = progressBarPosition;
      });
  
      experienceList.appendChild(li);
    });
  
    // Initially load the first work experience
    if (workExperiences.length > 0) {
      updateExperienceDescription(workExperiences[0]);
    }
  }
  
  
  function updateExperienceDescription(experience) {
    const positionElement = document.getElementById('position');
    const companyElement = document.getElementById('company');
    const durationElement = document.getElementById('duration');
    const descriptionElement = document.getElementById('description');
  
    positionElement.textContent = experience.position;
    companyElement.textContent = experience.company;
    durationElement.textContent = experience.duration;
  
    const descriptionLines = experience.description.split('\n');
    let descriptionHTML = '';
    descriptionLines.forEach((line) => {
      if (line.trim() !== '') {
        descriptionHTML += `<li>${line}</li>`;
      }
    });
    descriptionElement.innerHTML = `<ul>${descriptionHTML}</ul>`;
  
    // Display all fields when a list item is clicked
    durationElement.style.display = 'block';
    descriptionElement.style.display = 'block';
    positionElement.style.display = 'block';
  }
  
  
  window.onload = function () {
    populateWorkExperiences();
  };
  