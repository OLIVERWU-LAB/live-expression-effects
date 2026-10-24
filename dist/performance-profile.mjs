// Start within the device budget; do not wait for several overloaded shows first.
export function performanceProfile({width=1000,height=700,memory=8,cores=8,reduced=false}={}){
 const low=memory<=2||cores<=2,portrait=width<650&&height>width,mobile=width<650;
 return{particles:reduced?180:low?300:mobile?420:650,pixels:low?360000:mobile?550000:1600000,dpr:low?1:1.35,matte:512,trailStep:mobile||low?.032:.016,portrait};
}
