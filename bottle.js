const video=document.getElementById("bottle-vdo")
const observer=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
        if(entry.isIntersecting){
            video.play()
        }
        else{
            video.pause()
        }
    })
},{threshold:0})
observer.observe(video)