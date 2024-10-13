// SPDX-License-Identifier: MIT

// File: @uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol


pragma solidity >=0.5.0;

/// @title Callback for UniswapV3Pool swap action
/// @notice Any contract calling the swap function on a Uniswap V3 pool must implement this interface
interface IUniswapV3SwapCallback {
    /// @notice Invoked by `msg.sender` following a swap on the Uniswap V3 Pool.
    /// @dev This method requires the contract to settle the owed tokens for the swap.
    /// The caller must ensure that the pool corresponds to one deployed by the official UniswapV3Factory.
    /// Both `amount0Delta` and `amount1Delta` can be zero if no token was swapped.
    /// @param amount0Delta The amount of token0 that was either sent (negative) or must be received (positive).
    /// @param amount1Delta The amount of token1 that was either sent (negative) or must be received (positive).
    /// @param data Additional data passed from the swap function call.
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}

// File: @uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol


pragma solidity >=0.7.5;
pragma abicoder v2;

/// @title Interface for swapping tokens on Uniswap V3
/// @notice Defines functions to perform token swaps
interface ISwapRouter is IUniswapV3SwapCallback {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Executes a swap for the specified token input to receive as much as possible of another token.
    /// @param params The parameters for the swap, encoded as `ExactInputSingleParams`.
    /// @return amountOut The amount of the output token received.
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    /// @notice Executes a multi-hop swap with the specified path.
    /// @param params The parameters for the multi-hop swap, encoded as `ExactInputParams`.
    /// @return amountOut The amount of output tokens received.
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Executes a swap to deliver the exact output amount of a token using the minimum possible input.
    /// @param params The parameters for the swap, encoded as `ExactOutputSingleParams`.
    /// @return amountIn The amount of the input token spent.
    function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    /// @notice Executes a multi-hop swap to deliver the exact output amount of a token using the minimum possible input.
    /// @param params The parameters for the multi-hop swap, encoded as `ExactOutputParams`.
    /// @return amountIn The amount of input tokens spent.
    function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn);
}

// File: @openzeppelin/contracts/token/ERC20/IERC20.sol


// OpenZeppelin Contracts (latest version) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface for ERC20 standard as outlined by the EIP.
 */
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// File: SimpleSwap.sol


pragma solidity ^0.8.24;
 
// Importing necessary interfaces


contract BasicTokenSwap {
    ISwapRouter public swapRouter;
    address public WETH;
 
    // Setting up the Uniswap Router and WETH addresses in the constructor
    constructor(address _swapRouter, address _WETH) {
        swapRouter = ISwapRouter(_swapRouter);
        WETH = _WETH;
    }
 
    // Creating a function to handle the swap between two tokens
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) external {
        // Transferring tokens from the sender to the contract
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Token transfer failed");
 
        // Approving the Uniswap Router to spend the tokens
        require(IERC20(tokenIn).approve(address(swapRouter), amountIn), "Approval failed");
 
        // Creating the parameters for the swap
        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: 3000, // 0.3% fee tier
            recipient: to,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
 
        // Executing the swap on the Uniswap Router
        uint256 amountOut = swapRouter.exactInputSingle(swapParams);
 
        // Ensuring the output amount meets the minimum required
        require(amountOut >= minAmountOut, "Output amount too low");
    }
}
