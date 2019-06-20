import { isDeclaration, getDefinition } from "../semantics";
import * as assert from 'assert';

////////////////////////////////////////////////////////////////////////////////////////////////////
// isDeclaration
////////////////////////////////////////////////////////////////////////////////////////////////////
suite('semantics: isDeclaration TEST', () => {

    let dec_1 = 'void func();';
    test(`${dec_1} is declaration`, (done) => {
        assert.ok(isDeclaration(dec_1));
        done();
    });

    let dec_2 = 'void fun()';
    test(`${dec_2} is not declaration`, (done) => {
        assert.ok(!isDeclaration(dec_2));
        done();
    });

    let dec_3 = 'int func(int);';
    test(`${dec_3} is declaration`, (done) => {
        assert.ok(isDeclaration(dec_3));
        done();
    });

    let dec_4 = 'int func(int)';
    test(`${dec_4} is not declaration`, (done) => {
        assert.ok(!isDeclaration(dec_4));
        done();
    });

    let dec_5 = 'int func(int a);';
    test(`${dec_5} is declaration`, (done) => {
        assert.ok(isDeclaration(dec_5));
        done();
    });

    let dec_6 = 'int func(int a)';
    test(`${dec_6} is not declaration`, (done) => {
        assert.ok(!isDeclaration(dec_6));
        done();
    });

    let dec_7 = 'int func(int a, Vec b);';
    test(`${dec_7} is declaration`, (done) => {
        assert.ok(isDeclaration(dec_7));
        done();
    });

    let dec_8 = 'int func(int a Vec b)';
    test(`${dec_8} is not declaration`, (done) => {
        assert.ok(!isDeclaration(dec_8));
        done();
    });

    let dec_9 = 'int func(int a, Vec b) const;';
    test(`${dec_9} is declaration`, (done) => {
        assert.ok(isDeclaration(dec_9));
        done();
    });

    let dec_10 = 'int func(int a Vec b) const';
    test(`${dec_10} is not declaration`, (done) => {
        assert.ok(!isDeclaration(dec_10));
        done();
    });

    let dec_11 = 'virtual int func(int a, Vec b) const;';
    test(`${dec_11} is declaration`, (done) => {
        assert.ok(isDeclaration(dec_11));
        done();
    });

    let dec_12 = 'virtual int func(int a Vec b) const';
    test(`${dec_12} is not declaration`, (done) => {
        assert.ok(!isDeclaration(dec_12));
        done();
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// getDefinition
////////////////////////////////////////////////////////////////////////////////////////////////////
suite('semantics: getDefinition TEST', () => {
    let dec_1 = 'void func();';
    test(`analyse ${dec_1}`, (done) => {
        let d = getDefinition(dec_1);
        assert.ok(d.isValid);
        assert.equal(d.name, 'func');
        assert.equal(d.params, '');
        assert.deepEqual(d.prefixs, ['void']);
        assert.deepEqual(d.decoration, []);
        assert.equal(d.toString(true), 'void func() {');
        done();
    });

    let dec_2 = 'int func(int);';
    test(`analyse ${dec_2}`, (done) => {
        let d = getDefinition(dec_2);
        assert.ok(d.isValid);
        assert.equal(d.name, 'func');
        assert.equal(d.params, 'int');
        assert.deepEqual(d.prefixs, ['int']);
        assert.deepEqual(d.decoration, []);
        assert.equal(d.toString(true), 'int func(int) {');
        done();
    });

    let dec_3 = 'int func(int a);';
    test(`analyse ${dec_3}`, (done) => {
        let d = getDefinition(dec_3);
        assert.ok(d.isValid);
        assert.equal(d.name, 'func');
        assert.equal(d.params, 'int a');
        assert.deepEqual(d.prefixs, ['int']);
        assert.deepEqual(d.decoration, []);
        assert.equal(d.toString(true), 'int func(int a) {');
        done();
    });

    let dec_4 = 'int func(int a, Vec b);';
    test(`analyse ${dec_4}`, (done) => {
        let d = getDefinition(dec_4);
        assert.ok(d.isValid);
        assert.equal(d.name, 'func');
        assert.equal(d.params, 'int a, Vec b');
        assert.deepEqual(d.prefixs, ['int']);
        assert.deepEqual(d.decoration, []);
        assert.equal(d.toString(true), 'int func(int a, Vec b) {');
        done();
    });

    let dec_5 = 'int func(int a, Vec b) const;';
    test(`analyse ${dec_5}`, (done) => {
        let d = getDefinition(dec_5);
        assert.ok(d.isValid);
        assert.equal(d.name, 'func');
        assert.equal(d.params, 'int a, Vec b');
        assert.deepEqual(d.prefixs, ['int']);
        assert.deepEqual(d.decoration, ['const']);
        assert.equal(d.toString(true), 'int func(int a, Vec b) const {');
        done();
    });

    let dec_6 = 'virtual int func(int a, Vec b) const;';
    test(`anaylse ${dec_6}`, (done) => {
        let d = getDefinition(dec_6);
        assert.ok(d.isValid);
        assert.equal(d.name, 'func');
        assert.equal(d.params, 'int a, Vec b');
        assert.deepEqual(d.prefixs, ['int']);
        assert.deepEqual(d.decoration, ['const', 'override']);
        assert.equal(d.toString(true), 'int func(int a, Vec b) const override {');
        done();
    });

});
