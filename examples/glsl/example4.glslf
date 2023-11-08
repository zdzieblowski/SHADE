
/* original https://www.shadertoy.com/view/lslyRn  https://www.shadertoy.com/view/4dcBzX*/
#define iterations 17
#define formuparam 0.53

#define volsteps 20
#define stepsize 0.1

#define zoom   0.800
#define tile   0.850
#define speed  0.000 

#define brightness 0.0015
#define darkmatter 0.300
#define distfading 0.730
#define saturation 0.850


#define speed2 .2

float chebychev(vec3 a, vec3 b)
{
    return max(max(abs(a.x - b.x), abs(a.y - b.y)), abs(a.z - b.z));
}


float manhattan(vec3 a, vec3 b)
{
    vec3 d = abs(a - b);
    return d.x + d.y + d.z;
}

// iq
vec3 random3f( vec3 p )
{
    return fract(sin(vec3( dot(p,vec3(1.0,57.0,113.0)), 
                           dot(p,vec3(57.0,113.0,1.0)),
                           dot(p,vec3(113.0,1.0,57.0))))*43758.5453);
}

float voronoi3(vec3 p)
{
    vec3 fp = floor(p);
    
    float d1 = 1./0.;
    float d2 = 1./0.;
    
    for(int i = -1; i < 2; i++)
    {
        for(int j = -1; j < 2; j++)
        {
            for(int k = -1; k < 2; k++)
            {
                vec3 cur_p = fp + vec3(i, j, k);
                
                vec3 r = random3f(cur_p);
                
                float cd = 0.0;                    
                cd = chebychev(p, cur_p + r);
                d2 = min(d2, max(cd, d1));
                d1 = min(d1, cd);
            }
        }
    }
    return clamp(max(0.0, 16.0 * (d2-d1)), 0.0, 1.0);
}


vec2 rotate(vec2 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}


void mainVR( out vec4 fragColor, in vec2 fragCoord, in vec3 ro, in vec3 rd )
{
	//get coords and direction
	vec3 dir=rd;
	vec3 from=ro;
	
	//volumetric rendering
	float s=0.1,fade=1.;
	vec3 v=vec3(0.);
	for (int r=0; r<volsteps; r++) {
		vec3 p=from+s*dir*.5;
		p = abs(vec3(tile)-mod(p,vec3(tile*2.))); // tiling fold
		float pa,a=pa=0.;
		for (int i=0; i<iterations; i++) { 
			p=abs(p)/dot(p,p)-formuparam; // the magic formula
			a+=abs(length(p)-pa); // absolute sum of average change
			pa=length(p);
		}
		float dm=max(0.,darkmatter-a*a*.001); //dark matter
		a*=a*a; // add contrast
		if (r>6) fade*=1.-dm; // dark matter, don't render near
		//v+=vec3(dm,dm*.5,0.);
		v+=fade;
		v+=vec3(s,s*s,s*s*s*s)*a*brightness*fade; // coloring based on distance
		fade*=distfading; // distance fading
		s+=stepsize;
	}
	v=mix(vec3(length(v)),v,saturation); //color adjust
	fragColor = vec4(v*.03,1.);	
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	//get coords and direction
	vec2 uv=fragCoord.xy/iResolution.xy-.5;
	uv.y*=iResolution.y/iResolution.x;
	vec3 dir=vec3(uv*zoom,iTime*0.05);
	float time=iTime*speed+.25;

	 float piT = iTime*3.14159*speed;
    float linearT = iTime*speed;
    fragCoord -= iResolution.xy*.5;
    
  
    
    uv*=5.+pow(smoothstep(.3, -.3, sin(piT+.8-length(uv)*.1)), 1.)*100.;
    
    
	vec3 c = vec3(0.);
         uv.xy+=rotate(uv.xy,iTime/1.-length(uv.xy)*0.11);
    uv = abs(uv);
    uv.x-=linearT*.5;
    float d = uv.x + uv.y;
    linearT-= d*.1;
    uv-=cos(iTime);
    vec2 off = vec2(sin(cos(piT)-d), cos(sin(piT)+d))*.05;

    float amp = 1.;
    for(float i = 2.; i<8.; i++){
        vec3 m = vec3(
    	voronoi3(vec3(uv,i*5.+ abs(mod(linearT+.15, 2.5)-1.25))),
    	voronoi3(vec3(uv,i*5.+ abs(mod(linearT+.1, 2.5)-1.25))),
    	voronoi3(vec3(uv,i* 5.+ abs(mod(linearT+.05, 2.5)-1.25)))  //*/      
        );
        m = pow(m, vec3(2.));
    	uv*= .1;
        
        uv+=i;
        if(floor(mod(i, 2.))==1.){
            c*=m;
            uv.x+=sin(piT)*amp;
            //uv.y+=cos(t)*amp;
        }else{
            c+=m;
            uv.x-=sin(piT)*amp;
            //uv.y-=cos(t)*amp;
        }
    
    }
    c = c*.333;
	
	vec3 from=vec3(1.,.5,0.5)*c;
	from+=vec3(time*2.,time,-2.);

	
	mainVR(fragColor, fragCoord, from, dir);	
}
