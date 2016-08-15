import { expect } from "chai";

//
import * as common from "../../src/lib/common"

//
describe("lib", () => {
  describe("common", () => {
    //
    describe("method_name", () => {
      it("should return \"unknown\" for unnamed functions", () => {
        let result = common.method_name(() => {
          // example unnamed function
        });

        expect(result).to.be.a("string");
        expect(result).to.equal("unknown");
      });

      it("should return the name of a named function", () => {
        function test() {
          // example named function
        }

        let result = common.method_name(test);

        expect(result).to.be.a("string");
        expect(result).to.equal("test");
      });
    });

    //
    describe("pattern_name", () => {
      it("should return \"{default}\" if no pattern is provided", () => {
        let result = common.pattern_name();

        expect(result).to.be.a("string");
        expect(result).to.equal("{default}");
      });

      it("should return \"{default}\" if no an empty pattern is provided", () => {
        let result = common.pattern_name({});

        expect(result).to.be.a("string");
        expect(result).to.equal("{default}");
      });

      it("should convert a pattern into a friendly string", () => {
        let result = common.pattern_name({key: "value"});

        expect(result).to.be.a("string");
        expect(result).to.equal("{key=value}");
      });
    });
  });
});
