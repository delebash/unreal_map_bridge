export default {
    root: 'src',
    build: {
        cssCodeSplit: false,
        outDir: '../dist'
    },
    esbuild: {
        supported: {
            'top-level-await': true //browsers can handle top-level-await features
        },
    },
    worker:{
        format: 'es'
    }
}
