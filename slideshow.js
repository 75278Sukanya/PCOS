const slides=document.querySelectorAll('.image-section .slide');
const dots = document.querySelectorAll('.slide-dots .dot');
let current=0;

function goToSlide(index){
    slides[current].classList.remove('active')
    dots[current].classList.remove('active')
    current=index
     slides[current].classList.add('active')
    dots[current].classList.add('active')
}

dots.forEach((dot,index)=>{
    dot.addEventListener('click',()=>{
         console.log('dot clicked, index:', index) // add this
        goToSlide(index)
    })
})

setInterval(()=>{
     goToSlide((current+1)%slides.length)
},4000);