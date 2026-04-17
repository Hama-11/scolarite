export function setAuth(token,user){
    localStorage.setItem("token",token);
    localStorage.setItem("user",JSON.stringify(user));
}
export function clearAuth(){
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}
export function isAuthed(){
    return !!localStorage.getItem("token");
}
export function getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
}