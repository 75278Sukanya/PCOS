function startFactRotator(containerSelector,intervalTime){

    const container=document.querySelector(containerSelector)
    const facts= container.querySelectorAll('.fact')
    let current=0;

    setInterval(()=>{
    facts[current].classList.remove('active')
    current=(current+1)%facts.length
    facts[current].classList.add('active')
    },intervalTime);
    
}
startFactRotator('.facts-1',8000);
startFactRotator('.facts-2',8000);