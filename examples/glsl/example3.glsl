struct Light {
    vec3 color;
	
    float constant;
    float linear;
    float quadratic;
}; 
struct Line {
    vec2 point1;
    vec2 point2;
    float stroke;
    
    Light light;
};

const float distanceX = 50.0;
const int STEP_COUNT = 64;
const float MIN_HIT_DIST = 0.001;
const float MAX_TRACE_DIST = 0.5; 
const int LINE_COUNT = 3;

vec2 convertPixelToPos(vec2 pixel) {
    return ((pixel / iResolution.xy) - 0.5 ) * vec2(distanceX, distanceX * (iResolution.y / iResolution.x));
}

vec3 getAttenuation(Light light, float dist) {
    return light.color * (1.0 / (light.constant + light.linear * dist + 
    		    light.quadratic * (dist * dist)));
}

vec2 getClosestPointOnLine(Line line, vec2 p) {
    vec2 ba = line.point2-line.point1;
    vec2 pa = p-line.point1;
    float h =clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
      
    return line.point1 + h*ba;
}

float segmentSDF(vec2 p, Line line) {
    vec2 ba = line.point2-line.point1;
    vec2 pa = p-line.point1;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length(pa-h*ba) - line.stroke;
}

float getNearestDist(vec2 position, Line lines[LINE_COUNT], int lineIgnoreIndex) {
    float smallestDist = 10000.0;
    
    for (int i = 0; i < LINE_COUNT; i++) {
        if (i == lineIgnoreIndex) continue;
    
        smallestDist = min(smallestDist, segmentSDF(position, lines[i]));
    }
    
    return smallestDist;
}


vec3 getPositionColor(vec3 color, Line lines[LINE_COUNT], int lineIndex, vec2 position) {
    Line currLine = lines[lineIndex];
    
    
    float distToLight = segmentSDF(position, currLine);
    
    // Totally legit anti aliasing
    if (distToLight <= 0.0) {
        if (abs(distToLight) <= 0.05) {
            float t = (distToLight + 0.05) / 0.1;
            return mix(vec3(1.0,1.0,1.0), getAttenuation(currLine.light, 0.0), 1.0-(1.0-t)*(1.0-t));
        } else {
            return vec3(1.0,1.0,1.0);
        }
    }
    
    vec2 lightPosition = getClosestPointOnLine(currLine, position);
    vec2 rayDir = (lightPosition - position) / distToLight;
    
    float res = 1.0;
    float ph = 1e20;
    float t = MIN_HIT_DIST;
    
    
    for (int i = 0; i < 256; i++) {
        vec2 pos = position + rayDir * t;
        float h = getNearestDist(pos, lines, lineIndex);
        
        res = min(res, h/(0.3*t));
        t += clamp(h, 0.005, 0.5);
        
        if( res<-1.0 || t>distToLight ) break;
    }
    
    res = max(res,-1.0);
    res = 0.25*(1.0+res)*(1.0+res)*(2.0-res);
    
    vec3 attenuation = getAttenuation(currLine.light, distToLight);
       
    return attenuation * res;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    Line lines[LINE_COUNT];
    
    Light lineLight;
    lineLight.constant = 1.0;
    lineLight.linear = 0.5;
    lineLight.quadratic = 0.03;
    lineLight.color = vec3(0.95,0.2,0.3);
    
    lines[0].point1 = convertPixelToPos(iMouse.xy);
    lines[0].point2 = vec2(10.0,8.0);
    lines[0].stroke = 0.1;
    lines[0].light = lineLight;
    
    Light lineLight2;
    lineLight2.constant = 1.0;
    lineLight2.linear = 0.5;
    lineLight2.quadratic = 0.03;
    lineLight2.color = vec3(0.3,0.7,0.3);
    
    lines[1].point1 = vec2(-19.0,-5.0);
    lines[1].point2 = vec2(13.0,-2.0);
    lines[1].stroke = 0.1;
    lines[1].light = lineLight2;
    
    Light lineLight3;
    lineLight3.constant = 1.0;
    lineLight3.linear = 0.5;
    lineLight3.quadratic = 0.03;
    lineLight3.color = vec3(0.15,0.4,0.7);
    
    lines[2].point1 = vec2(-14.0,7.0);
    lines[2].point2 = vec2(-18.0,-1.0);
    lines[2].stroke = 0.1;
    lines[2].light = lineLight3;
    
    vec2 position = convertPixelToPos(fragCoord);
    vec3 color = vec3(0.0, 0.0, 0.0);
    
    
    for (int i = 0; i < LINE_COUNT; i++) {
        color += getPositionColor(color, lines, i, position);  
    }
    
    fragColor = vec4(color.xyz, 1.0);
}
