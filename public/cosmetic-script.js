var moments = document.querySelectorAll("div.img-thumbnail")

for(var i = 0; i < moments.length; i++){
    (function(i){
        moments[i].addEventListener("mouseover", function(){
            moments[i].classList.add("enlarge")
        })
        moments[i].addEventListener("mouseout", function(){
            moments[i].classList.remove("enlarge")
        })
    }(i))
}