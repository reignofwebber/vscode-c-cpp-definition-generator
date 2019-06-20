import { isDeclaration, getDefinition, Scope } from "../semantics";
import * as assert from 'assert';

////////////////////////////////////////////////////////////////////////////////////////////////////
// scope test
////////////////////////////////////////////////////////////////////////////////////////////////////
suite('scope  TEST', () => {

    let dec_1 =
`
struct S1{
    int a func();
}
`;
    test(`a struct`, (done) => {
        let scope = Scope.createScope(dec_1);
        assert.deepEqual(scope.getScopes(15), ['S1']);
        done();
    });

    let dec_2 =
`
struct S1{
    int func();
};

class S2 {
    in func();
};
`;
    test(`2 or more struct`, (done) => {
        let scope = Scope.createScope(dec_2);
        assert.deepEqual(scope.getScopes(42), ['S2']);
        done();
    });

    let dec_3 =
`
namespace S1 {
    struct A1 {
        void func();
    };
}
`;
    test(`nested scopes`, (done) => {
        let scope = Scope.createScope(dec_3);
        assert.deepEqual(scope.getScopes(42), ['S1', 'A1']);
        done();
    });

    let dec_4 =
`
namespace S1 {
    struct A1 {
        void func();
    };
    void func();
}
`;
    test(`nested scopes`, (done) => {
        let scope = Scope.createScope(dec_4);
        assert.deepEqual(scope.getScopes(66), ['S1']);
        done();
    });

    let dec_5 =
`
namespace S1 {
    struct {
        void func();
    } a1;
    void func();
}
`;
    test(`anonymous test`, (done) => {
        let scope = Scope.createScope(dec_5);
        assert.deepEqual(scope.getScopes(66), ['S1']);
        done();
    });


});
