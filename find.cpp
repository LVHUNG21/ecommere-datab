#include<iostream>
using namespace std;
int main(){
    int a,b,c,d,e,f,g;
    a=6;b=5;c=8;d=7;e=12;f=1;g=2;
    int max1=a;
    int max2=b;
    if(c>max1){ 
        max2=max1;
        max1=c;
    }else if(c>max2){
        max2=c;
    }
    if(d>max1){ 
        max2=max1;
        max1=d;
    }else if(d>max2){
        max2=d;
    }
    if(e>max1){ 
        max2=max1;
        max1=e;
    }else if(e>max2){
        max2=e;
    }
    if(f>max1){ 
        max2=max1;
        max1=f;
    }else if(f>max2){
        max2=f;
    }
    if(g>max1){ 
        max2=max1;
        max1=g;
    }else if(g>max2){
        max2=g;
    }
    cout<<max2<<endl;
    return 0;
}