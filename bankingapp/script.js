'use strict';

/////////////////////////////////////////////////
/////////////////////////////////////////////////
// BANKIST APP

// Data
const account1 = {
  owner: 'Jonas Shmedtmann',
  movements: [200, 455.23, -306.5, 25000, -642.21, -133.9, 79.97, 1300],
  interestRate: 1.2, // %
  pin: 1111,
  username: 'js',
  movementsDates: [
    '2019-11-18T21:31:17.178Z',
    '2019-12-23T07:42:02.383Z',
    '2020-01-28T09:15:04.904Z',
    '2020-04-01T10:17:24.185Z',
    '2020-05-08T14:11:59.604Z',
    '2020-05-27T17:01:17.194Z',
    '2020-07-11T23:36:17.929Z',
    '2020-07-12T10:51:36.790Z',
  ],
  currency: 'EUR',
  locale: 'pt-PT', // de-DE
};

const account2 = {
  owner: 'Jessica Davis',
  username: 'jd',
  movements: [5000, 3400, -150, -790, -3210, -1000, 8500, -30],
  interestRate: 1.5,
  pin: 2222,

  movementsDates: [
    '2019-11-01T13:15:33.035Z',
    '2019-11-30T09:48:16.867Z',
    '2019-12-25T06:04:23.907Z',
    '2020-01-25T14:18:46.235Z',
    '2020-02-05T16:33:06.386Z',
    '2020-04-10T14:43:26.374Z',
    '2020-06-25T18:49:59.371Z',
    '2020-07-26T12:01:20.894Z',
  ],
  currency: 'USD',
  locale: 'en-US',
};

const account3 = {
  owner: 'Steven Thomas Williams',
  username: 'stw',
  movements: [200, -200, 340, -300, -20, 50, 400, -460],
  interestRate: 0.7,
  pin: 3333,
};

const account4 = {
  owner: 'Sarah Smith',
  username: 'ss',
  movements: [430, 1000, 700, 50, 90],
  interestRate: 1,
  pin: 4444,
};

const accounts = [account1, account2, account3, account4];

// Elements
const labelWelcome = document.querySelector('.welcome');
const labelDate = document.querySelector('.date');
const labelBalance = document.querySelector('.balance__value');
const labelSumIn = document.querySelector('.summary__value--in');
const labelSumOut = document.querySelector('.summary__value--out');
const labelSumInterest = document.querySelector('.summary__value--interest');
const labelTimer = document.querySelector('.timer');

const containerApp = document.querySelector('.app');
const containerMovements = document.querySelector('.movements');

const btnLogin = document.querySelector('.login__btn');
const btnTransfer = document.querySelector('.form__btn--transfer');
const btnLoan = document.querySelector('.form__btn--loan');
const btnClose = document.querySelector('.form__btn--close');
const btnSort = document.querySelector('.btn--sort');

const inputLoginUsername = document.querySelector('.login__input--user');
const inputLoginPin = document.querySelector('.login__input--pin');
const inputTransferTo = document.querySelector('.form__input--to');
const inputTransferAmount = document.querySelector('.form__input--amount');
const inputLoanAmount = document.querySelector('.form__input--loan-amount');
const inputCloseUsername = document.querySelector('.form__input--user');
const inputClosePin = document.querySelector('.form__input--pin');

const displayMovements = function (acc, sort=false){
  document.querySelector('.movements').innerHTML='';

  const movs=sort ? acc.movements.slice().sort((a,b)=> a-b) : acc.movements;

  movs.forEach(function (mov, i){
    const type = (mov>0)? 'deposit' : 'withdrawal';
    const date = new Date(acc.movementsDates[i]);

    const now=new Date();
    const day = `${date.getDate()}`.padStart(2,0);
    const month= `${date.getMonth()+1}`.padStart(2,0);
    const year = date.getFullYear();
    const displayDate=`${day}/${month}/${year}`;

    const html=`
    <div class="movements__row">
    <div class="movements__date">${displayDate}</div>
    <div class="movements__type movements__type--${type}">${i+1} ${type}</div>
    <div class="movements__value">${mov.toFixed(2)}€</div>
    `;

    containerMovements.insertAdjacentHTML('afterbegin', html);
  });
};

displayMovements(account1);
/////////////////////////////////////////////////
/////////////////////////////////////////////////
// LECTURES


const movements = [200, 450, -400, 3000, -650, -130, 70, 1300];

for (const [i, movement] of movements.entries()){
  if (movement>0){
    console.log(`Movement ${i+1} You deposited ${movement.toFixed(2)}`);
  }
  else{
    console.log(`Movement You withdrew ${movement.toFixed(2)}`);
  }
}

movements.forEach(function(mov, i, arr){
  if (mov>0){
    console.log(`Movement ${i+1} You deposited ${mov}`);
  }
  else{
    console.log(`Movement ${i+1} You withdrew ${Math.abs(mov)}`);
  }
})


/////////////////////////////////////////////////
let arr = ['a', 'b', 'c', 'd', 'e'];

//Slice 
console.log(arr.slice(2));
console.log(arr.slice(2,4));
console.log(arr.slice(-2));

//Splice
console.log(arr.splice(2));

const arr1 = [23, 11, 64];
console.log(arr[0]);
console.log(arr.at(0 ));

const currencies = new Map([
  ['USD', 'United States dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'Pound sterling'],
]);

//i mov in for(const [i,mov] of movements.entries())
//mov i arr in forEach() in arrays
currencies.forEach(function(value, key, map){
  console.log(`${key}: ${value}`);
});


const apiKey = '9a7dea0e2aa946c48e769034c5321b30';
const apiUrl = 'https://openexchangerates.org/api';

const converterForm = document.querySelector('#currency-converter form');
const resultDiv = document.querySelector('#currency-converter #result');

converterForm.addEventListener('submit', event => {
  event.preventDefault(); // Prevent form submission

  const fromCurrency = converterForm.elements['from-currency'].value;
  const toCurrency = converterForm.elements['to-currency'].value;
  const amount = converterForm.elements['amount'].value;

  fetch(`${apiUrl}/latest.json?app_id=${apiKey}&base=${fromCurrency}`)
    .then(response => response.json())
    .then(data => {
      const rate = data.rates[toCurrency];
      const result = amount * rate;
      resultDiv.textContent = `${amount} ${fromCurrency} = ${result.toFixed(2)} ${toCurrency}`;

      //Continue after having fetched everything
    //----------------------------------------
    makingArrays();
    createUsernames(accounts);
    const withdrawals= filtering(movements);
    const balance= accBalance(account1);
    calcDisplaySummary(account1);
    //-----------------------------------------
    })
    .catch(error => {
      console.log('Error:', error);
    });
});

  function makingArrays(){
      makeArraysNum();
      const movementsDescription=makeArraysDesc();
      console.log(movementsDescription);
      function makeArraysNum(){
      const movementsUSD= movements.map(mov=> {
        return mov*toUSD;
      })
      //const movementsUSD = movements.map(mov => mov * toUSD);
      const movementsUSD2=[];
      for(const mov of movements){
        movementsUSD2.push(mov*toUSD)
      }
      console.log(movementsUSD);
      console.log(movementsUSD2);
    }
    function makeArraysDesc(){

      //.map(), .forEach(), .for
      const movementDescriptions=movements.map((mov, i , arr)=>{
        `Movement ${i+1}: You ${mov>0 ? 'deposited' : 'withdres'} ${Math.abs(mov)}`;
      })

      const movementsDescription= movements.map((mov, i, arr)=>{
        if (mov>0){
          return `Movement ${i+1}: You deposited ${Math.abs(mov)}`
        }
        else{
          return `Movement ${i+1}: You withdrew ${Math.abs(mov)}`
        }
      })
      return movementsDescription;
    }

      //----------------------------------------
  }

  function createUsernames(accs){
    accs.forEach(function(acc){
        const usernameWords= acc.owner.toLowerCase().split(" ");
        const usernameLetters= usernameWords.map((mov, i, arr)=>{
          return mov[0]
        });
        const username=usernameLetters.join('');
        acc.username=username;
    })
  }

  function filtering(movements){
    const withdrawals= movements.filter((mov, i, arr)=>{
      return mov<0;
    });
    return withdrawals;
  }

  function accBalance(acc){
     acc.balance= acc.movements.reduce((acc, mov, i , arr)=>
      acc+mov, 0);
    document.querySelector('.balance__value').textContent=`${acc.balance.toFixed(2)}€`;
  }

  function calcDisplaySummary(acc){
    const incomes=acc.movements.filter(mov=>mov>0).reduce((acc,mov,i,arr)=>acc+mov,0);
    labelSumIn.textContent=`${incomes.toFixed(2)}€`;

    const out= acc.movements.filter(mov=>mov<0).reduce(function (acc,mov){return acc+mov}, 0);
    labelSumOut.textContent=`${Math.abs(out).toFixed(2)}€`;

    const interest= acc.movements.filter(mov=>mov>0).map(deposit=>deposit*acc.interestRate/100).reduce((acc, int, i, arr)=>acc+int,0);
    console.log(interest);
    labelSumInterest.textContent=`${(Math.round(interest*10)/10).toFixed(2)}€`
  }

  function updateUI(currentAccount){
    //Display movements
    displayMovements(currentAccount);
    //Display summary
    calcDisplaySummary(currentAccount);
    //Display balance
    accBalance(currentAccount);
  }

  const startLogoutTimer=function(){
    //Set time to 5 mins
    let time = 180;
    const tick =function(){
      const min = String(Math.trunc(time/60)).padStart(2,0);
      const sec = String(time%60).padStart(2,0);
      labelTimer.textContent=`${min}:${sec}`;
      //Decrease 1s

      time--;

      if (time===0){
        clearInterval(timer);
        labelWelcome.textContent='Login to get started';
        containerApp.style.opacity=0;
      }
    }
    //Call timer every 5 secs 
    tick();
    timer= setInterval(tick,1000)

    return timer;
    //0 seconds, stop timer and logout
  }
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Event Handlers
let currentAccount, timer;
  btnLogin.addEventListener('click', function(e){
    e.preventDefault();
    //This prevents form from submitting

    if (timer) clearInterval (timer);
    timer= startLogoutTimer();

    console.log('Login');

    currentAccount=accounts.find(
      acc=> acc.username===inputLoginUsername.value
      );
    console.log(currentAccount);
    console.log(accounts);
    if(currentAccount?.pin===Number(inputLoginPin.value)){
      labelWelcome.textContent=`Welcome back, ${currentAccount.owner.split(' ')[0]}`;
      containerApp.style.opacity=100;

      //clear input fields
      inputLoginUsername.value= inputLoginPin.value='';
      inputLoginPin.blur();
      updateUI(currentAccount);
    }
  })

//  document.querySelector().addEventListener('',)
//  .textContent()

btnTransfer.addEventListener('click', (e)=>{
  e.preventDefault();
  const amount = Number(inputTransferAmount.value);
  const recAcc= accounts.find(acc=> acc.username===inputTransferTo.value);
  inputTransferAmount.value=inputTransferTo.value='';

  if(amount>0 && currentAccount.balance>=amount && recAcc && recAcc?.username!==currentAccount.username){
    currentAccount.movements.push(-amount);
    recAcc.movements.push(amount);
    updateUI(currentAccount);
  }

});

btnLoan.addEventListener('click',(e)=>{
  e.preventDefault();
  const amount= Math.floor(inputLoanAmount.value);
  if (amount>0 && currentAccount.movements.some(mov=> mov>= amount*0.1)){
    // Add movement
    currentAccount.movements.push(amount);

    //Update UI 
    updateUI(currentAccount);
  }
  inputLoanAmount.value='';
})

btnClose.addEventListener('click', (e)=>{
  e.preventDefault();
  if(Number(inputClosePin.value)===currentAccount.pin && inputCloseUsername.value===currentAccount.username){
    const index= accounts.findIndex(
      acc=>acc.username===currentAccount.username);
    console.log(index);
    accounts.splice(index, 1);
    //Hide UI
    containerApp.style.opacity=0;
  }
  inputCloseUsername.value=inputClosePin.value='';

});

let sorted= false;
btnSort.addEventListener('click', (e)=>{
e.preventDefault();
displayMovements(currentAccount, !sorted);
sorted=!sorted;
});

const now=new Date();
const day = `${now.getDate()}`.padStart(2,0);
const month= `${now.getMonth()+1}`.padStart(2,0);
const year = now.getFullYear();
const hour= `${now.getHours()+1}`.padStart(2,0);
const min = `${now.getMinutes()}`.padStart(2,0);
labelDate.textContent=`${day}/${month}/${year}, ${hour}:${min}`;